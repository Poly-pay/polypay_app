import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateAddressGroupDto,
  UpdateAddressGroupDto,
  CreateContactDto,
  UpdateContactDto,
} from './dto';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class AddressBookService {
  constructor(private prisma: PrismaService) {}

  // ==================== Address Group ====================

  async createGroup(dto: CreateAddressGroupDto) {
    // Verify wallet exists
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: dto.walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.prisma.addressGroup.create({
      data: {
        walletId: dto.walletId,
        name: dto.name,
      },
      include: {
        contacts: true,
      },
    });
  }

  async findGroupsByWallet(walletId: string) {
    return this.prisma.addressGroup.findMany({
      where: { walletId },
      include: {
        contacts: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findGroupById(id: string) {
    const group = await this.prisma.addressGroup.findUnique({
      where: { id },
      include: {
        contacts: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Address group not found');
    }

    return group;
  }

  async updateGroup(id: string, dto: UpdateAddressGroupDto) {
    const group = await this.prisma.addressGroup.findUnique({
      where: { id },
    });

    if (!group) {
      throw new NotFoundException('Address group not found');
    }

    return this.prisma.addressGroup.update({
      where: { id },
      data: {
        name: dto.name,
      },
      include: {
        contacts: true,
      },
    });
  }

  async deleteGroup(id: string) {
    const group = await this.prisma.addressGroup.findUnique({
      where: { id },
    });

    if (!group) {
      throw new NotFoundException('Address group not found');
    }

    // Cascade delete will remove contacts
    await this.prisma.addressGroup.delete({
      where: { id },
    });

    return { message: 'Address group deleted' };
  }

  // ==================== Contact ====================

  async createContact(dto: CreateContactDto) {
    // Verify group exists
    const group = await this.prisma.addressGroup.findUnique({
      where: { id: dto.groupId },
    });

    if (!group) {
      throw new NotFoundException('Address group not found');
    }

    return this.prisma.contact.create({
      data: {
        groupId: dto.groupId,
        name: dto.name,
        address: dto.address,
      },
    });
  }

  async findContactsByGroup(groupId: string) {
    return this.prisma.contact.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findContactById(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  async updateContact(id: string, dto: UpdateContactDto) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return this.prisma.contact.update({
      where: { id },
      data: {
        name: dto.name,
        address: dto.address,
      },
    });
  }

  async deleteContact(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    await this.prisma.contact.delete({
      where: { id },
    });

    return { message: 'Contact deleted' };
  }
}