import { NOT_MEMBER_OF_ACCOUNT } from '@/common/constants';
import { PrismaService } from '@/database/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  CreateContactGroupDto,
  UpdateContactGroupDto,
  CreateContactDto,
  UpdateContactDto,
} from '@polypay/shared';

@Injectable()
export class ContactBookService {
  private readonly logger = new Logger(ContactBookService.name);
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

  // ============ CONTACT GROUP ============

  async createGroup(dto: CreateContactGroupDto, userCommitment: string) {
    // Check if user is a signer of the account
    const membership = await this.prisma.accountSigner.findFirst({
      where: {
        account: { id: dto.accountId },
        user: { commitment: userCommitment },
      },
    });

    if (!membership) {
      throw new ForbiddenException(NOT_MEMBER_OF_ACCOUNT);
    }

    if (dto.contactIds?.length) {
      const contacts = await this.prisma.contact.findMany({
        where: { id: { in: dto.contactIds }, accountId: dto.accountId },
      });

      if (contacts.length !== dto.contactIds.length) {
        throw new BadRequestException(
          'One or more contacts not found or belong to different account',
        );
      }
    }

    try {
      return await this.prisma.contactGroup.create({
        data: {
          accountId: dto.accountId,
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

  async getGroups(accountId: string, userCommitment: string) {
    // Check if user is a signer of the account
    const membership = await this.prisma.accountSigner.findFirst({
      where: {
        account: { id: accountId },
        user: { commitment: userCommitment },
      },
    });

    if (!membership) {
      throw new ForbiddenException(NOT_MEMBER_OF_ACCOUNT);
    }

    return this.prisma.contactGroup.findMany({
      where: { accountId },
      include: {
        contacts: { include: { contact: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGroup(id: string) {
    const group = await this.prisma.contactGroup.findUnique({
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

  async updateGroup(id: string, dto: UpdateContactGroupDto) {
    const group = await this.prisma.contactGroup.findUnique({ where: { id } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (dto.contactIds?.length) {
      const contacts = await this.prisma.contact.findMany({
        where: { id: { in: dto.contactIds }, accountId: group.accountId },
      });

      if (contacts.length !== dto.contactIds.length) {
        throw new BadRequestException(
          'One or more contacts not found or belong to different account',
        );
      }
    }

    try {
      return await this.prisma.contactGroup.update({
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
    const group = await this.prisma.contactGroup.findUnique({ where: { id } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.prisma.contactGroup.delete({ where: { id } });
  }

  // ============ CONTACT ============

  async createContact(dto: CreateContactDto, userCommitment: string) {
    // Check if user is a signer of the account
    const membership = await this.prisma.accountSigner.findFirst({
      where: {
        account: { id: dto.accountId },
        user: { commitment: userCommitment },
      },
    });

    if (!membership) {
      throw new ForbiddenException(NOT_MEMBER_OF_ACCOUNT);
    }

    const groups = await this.prisma.contactGroup.findMany({
      where: { id: { in: dto.groupIds }, accountId: dto.accountId },
    });

    if (groups.length !== dto.groupIds.length) {
      throw new BadRequestException(
        'One or more groups not found or belong to different account',
      );
    }

    try {
      return await this.prisma.contact.create({
        data: {
          accountId: dto.accountId,
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

  async getContacts(
    accountId: string,
    userCommitment?: string,
    groupId?: string,
  ) {
    // Check if user is a signer of the account
    if (userCommitment) {
      const membership = await this.prisma.accountSigner.findFirst({
        where: {
          account: { id: accountId },
          user: { commitment: userCommitment },
        },
      });

      if (!membership) {
        throw new ForbiddenException(NOT_MEMBER_OF_ACCOUNT);
      }
    }

    return this.prisma.contact.findMany({
      where: {
        accountId,
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
      const groups = await this.prisma.contactGroup.findMany({
        where: { id: { in: dto.groupIds }, accountId: contact.accountId },
      });

      if (groups.length !== dto.groupIds.length) {
        throw new BadRequestException(
          'One or more groups not found or belong to different account',
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
