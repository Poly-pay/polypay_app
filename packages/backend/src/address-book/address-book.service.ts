import { PrismaService } from '@/database/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  CreateAddressGroupDto,
  UpdateAddressGroupDto,
  CreateContactDto,
  UpdateContactDto,
} from '@polypay/shared';

@Injectable()
export class AddressBookService {
  constructor(private prisma: PrismaService) {}

  // Helper to handle Prisma unique constraint errors
  private handlePrismaError(error: unknown, entity: 'Group' | 'Contact') {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const fields = (error.meta?.target as string[]) || [];
        if (fields.includes('name')) {
          throw new ConflictException(
            `${entity} with this name already exists`,
          );
        }
        if (fields.includes('address')) {
          throw new ConflictException(
            'Contact with this address already exists',
          );
        }
        throw new ConflictException(`${entity} already exists`);
      }
    }
    throw error;
  }

  // ============ ADDRESS GROUP ============

  async createGroup(dto: CreateAddressGroupDto) {
    if (dto.contactIds?.length) {
      const contacts = await this.prisma.contact.findMany({
        where: { id: { in: dto.contactIds }, walletId: dto.walletId },
      });

      if (contacts.length !== dto.contactIds.length) {
        throw new BadRequestException(
          'One or more contacts not found or belong to different wallet',
        );
      }
    }

    try {
      return await this.prisma.addressGroup.create({
        data: {
          walletId: dto.walletId,
          name: dto.name,
          contacts: dto.contactIds?.length
            ? { create: dto.contactIds.map((contactId) => ({ contactId })) }
            : undefined,
        },
        include: {
          contacts: { include: { contact: true } },
        },
      });
    } catch (error) {
      this.handlePrismaError(error, 'Group');
    }
  }

  async getGroups(walletId: string) {
    return this.prisma.addressGroup.findMany({
      where: { walletId },
      include: {
        contacts: { include: { contact: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGroup(id: string) {
    const group = await this.prisma.addressGroup.findUnique({
      where: { id },
      include: {
        contacts: { include: { contact: true } },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  async updateGroup(id: string, dto: UpdateAddressGroupDto) {
    const group = await this.prisma.addressGroup.findUnique({ where: { id } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (dto.contactIds?.length) {
      const contacts = await this.prisma.contact.findMany({
        where: { id: { in: dto.contactIds }, walletId: group.walletId },
      });

      if (contacts.length !== dto.contactIds.length) {
        throw new BadRequestException(
          'One or more contacts not found or belong to different wallet',
        );
      }
    }

    try {
      return await this.prisma.addressGroup.update({
        where: { id },
        data: {
          name: dto.name,
          contacts: dto.contactIds
            ? {
                deleteMany: {},
                create: dto.contactIds.map((contactId) => ({ contactId })),
              }
            : undefined,
        },
        include: {
          contacts: { include: { contact: true } },
        },
      });
    } catch (error) {
      this.handlePrismaError(error, 'Group');
    }
  }

  async deleteGroup(id: string) {
    const group = await this.prisma.addressGroup.findUnique({ where: { id } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.prisma.addressGroup.delete({ where: { id } });
  }

  // ============ CONTACT ============

  async createContact(dto: CreateContactDto) {
    const groups = await this.prisma.addressGroup.findMany({
      where: { id: { in: dto.groupIds }, walletId: dto.walletId },
    });

    if (groups.length !== dto.groupIds.length) {
      throw new BadRequestException(
        'One or more groups not found or belong to different wallet',
      );
    }

    try {
      return await this.prisma.contact.create({
        data: {
          walletId: dto.walletId,
          name: dto.name,
          address: dto.address,
          groups: {
            create: dto.groupIds.map((groupId) => ({ groupId })),
          },
        },
        include: {
          groups: { include: { group: true } },
        },
      });
    } catch (error) {
      this.handlePrismaError(error, 'Contact');
    }
  }

  async getContacts(walletId: string, groupId?: string) {
    return this.prisma.contact.findMany({
      where: {
        walletId,
        ...(groupId && {
          groups: { some: { groupId } },
        }),
      },
      include: {
        groups: { include: { group: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getContact(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        groups: { include: { group: true } },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  async updateContact(id: string, dto: UpdateContactDto) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    if (dto.groupIds?.length) {
      const groups = await this.prisma.addressGroup.findMany({
        where: { id: { in: dto.groupIds }, walletId: contact.walletId },
      });

      if (groups.length !== dto.groupIds.length) {
        throw new BadRequestException(
          'One or more groups not found or belong to different wallet',
        );
      }
    }

    try {
      return await this.prisma.contact.update({
        where: { id },
        data: {
          name: dto.name,
          address: dto.address,
          groups: dto.groupIds
            ? {
                deleteMany: {},
                create: dto.groupIds.map((groupId) => ({ groupId })),
              }
            : undefined,
        },
        include: {
          groups: { include: { group: true } },
        },
      });
    } catch (error) {
      this.handlePrismaError(error, 'Contact');
    }
  }

  async deleteContact(id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return this.prisma.contact.delete({ where: { id } });
  }
}
