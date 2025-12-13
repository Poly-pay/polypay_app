import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AddressBookService } from './address-book.service';
import {
  CreateAddressGroupDto,
  CreateContactDto,
  UpdateAddressGroupDto,
  UpdateContactDto,
} from '@polypay/shared';

@Controller('api/address-book')
export class AddressBookController {
  constructor(private readonly addressBookService: AddressBookService) {}

  // ==================== Address Group ====================

  @Post('groups')
  createGroup(@Body() dto: CreateAddressGroupDto) {
    return this.addressBookService.createGroup(dto);
  }

  @Get('groups')
  findGroupsByWallet(@Query('walletId') walletId: string) {
    return this.addressBookService.findGroupsByWallet(walletId);
  }

  @Get('groups/:id')
  findGroupById(@Param('id') id: string) {
    return this.addressBookService.findGroupById(id);
  }

  @Patch('groups/:id')
  updateGroup(@Param('id') id: string, @Body() dto: UpdateAddressGroupDto) {
    return this.addressBookService.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id') id: string) {
    return this.addressBookService.deleteGroup(id);
  }

  // ==================== Contact ====================

  @Post('contacts')
  createContact(@Body() dto: CreateContactDto) {
    return this.addressBookService.createContact(dto);
  }

  @Get('contacts')
  findContactsByGroup(@Query('groupId') groupId: string) {
    return this.addressBookService.findContactsByGroup(groupId);
  }

  @Get('contacts/:id')
  findContactById(@Param('id') id: string) {
    return this.addressBookService.findContactById(id);
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
