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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AddressBookService } from './address-book.service';
import {
  CreateAddressGroupDto,
  UpdateAddressGroupDto,
  CreateContactDto,
  UpdateContactDto,
} from '@polypay/shared';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@ApiTags('address-book')
@Controller('address-book')
@UseGuards(JwtAuthGuard)
export class AddressBookController {
  constructor(private readonly addressBookService: AddressBookService) {}

  // ============ GROUPS ============

  @Post('groups')
  @ApiOperation({ summary: 'Create a new address group' })
  @ApiBody({ type: CreateAddressGroupDto })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  createGroup(@Body() dto: CreateAddressGroupDto) {
    return this.addressBookService.createGroup(dto);
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get all address groups for a wallet' })
  @ApiQuery({ name: 'walletId', required: true, description: 'Wallet ID' })
  @ApiResponse({ status: 200, description: 'List of address groups' })
  @ApiResponse({ status: 400, description: 'walletId is required' })
  getGroups(@Query('walletId') walletId: string) {
    if (!walletId) {
      throw new BadRequestException('walletId is required');
    }
    return this.addressBookService.getGroups(walletId);
  }

  @Get('groups/:id')
  @ApiOperation({ summary: 'Get a single address group by ID' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Group found' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  getGroup(@Param('id') id: string) {
    return this.addressBookService.getGroup(id);
  }

  @Patch('groups/:id')
  @ApiOperation({ summary: 'Update an address group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({ type: UpdateAddressGroupDto })
  @ApiResponse({ status: 200, description: 'Group updated successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  updateGroup(@Param('id') id: string, @Body() dto: UpdateAddressGroupDto) {
    return this.addressBookService.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  @ApiOperation({ summary: 'Delete an address group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Group deleted successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  deleteGroup(@Param('id') id: string) {
    return this.addressBookService.deleteGroup(id);
  }

  // ============ CONTACTS ============

  @Post('contacts')
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiBody({ type: CreateContactDto })
  @ApiResponse({ status: 201, description: 'Contact created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  createContact(@Body() dto: CreateContactDto) {
    return this.addressBookService.createContact(dto);
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Get all contacts for a wallet' })
  @ApiQuery({ name: 'walletId', required: true, description: 'Wallet ID' })
  @ApiQuery({
    name: 'groupId',
    required: false,
    description: 'Filter by group ID',
  })
  @ApiResponse({ status: 200, description: 'List of contacts' })
  @ApiResponse({ status: 400, description: 'walletId is required' })
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
  @ApiOperation({ summary: 'Get a single contact by ID' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact found' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  getContact(@Param('id') id: string) {
    return this.addressBookService.getContact(id);
  }

  @Patch('contacts/:id')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiBody({ type: UpdateContactDto })
  @ApiResponse({ status: 200, description: 'Contact updated successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  updateContact(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.addressBookService.updateContact(id, dto);
  }

  @Delete('contacts/:id')
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  deleteContact(@Param('id') id: string) {
    return this.addressBookService.deleteContact(id);
  }
}
