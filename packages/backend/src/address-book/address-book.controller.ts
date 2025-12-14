import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AddressBookService } from './address-book.service';
import {
  CreateAddressGroupDto,
  UpdateAddressGroupDto,
  CreateContactDto,
  UpdateContactDto,
} from '@polypay/shared';

@Controller('address-book')
export class AddressBookController {
  constructor(private readonly addressBookService: AddressBookService) {}

  // ============ GROUPS ============

  @Post('groups')
  createGroup(@Body() dto: CreateAddressGroupDto) {
    return this.addressBookService.createGroup(dto);
  }

  @Get('groups')
  getGroups(@Query('walletId') walletId: string) {
    if (!walletId) {
      throw new BadRequestException('walletId is required');
    }
    return this.addressBookService.getGroups(walletId);
  }

  @Get('groups/:id')
  getGroup(@Param('id') id: string) {
    return this.addressBookService.getGroup(id);
  }

  @Patch('groups/:id')
  updateGroup(@Param('id') id: string, @Body() dto: UpdateAddressGroupDto) {
    return this.addressBookService.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id') id: string) {
    return this.addressBookService.deleteGroup(id);
  }

  // ============ CONTACTS ============

  @Post('contacts')
  createContact(@Body() dto: CreateContactDto) {
    return this.addressBookService.createContact(dto);
  }

  @Get('contacts')
  getContacts(
    @Query('walletId') walletId: string,
    @Query('groupId') groupId?: string,
  ) {
    if (!walletId) {
      throw new BadRequestException('walletId is required');
    }
    return this.addressBookService.getContacts(walletId, groupId);
  }

  @Get('contacts/:id')
  getContact(@Param('id') id: string) {
    return this.addressBookService.getContact(id);
  }

  @Patch('contacts/:id')
  updateContact(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.addressBookService.updateContact(id, dto);
  }

  @Delete('contacts/:id')
  deleteContact(@Param('id') id: string) {
    return this.addressBookService.deleteContact(id);
  }
}
