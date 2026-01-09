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
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  CreateContactGroupDto,
  UpdateContactGroupDto,
  CreateContactDto,
  UpdateContactDto,
} from '@polypay/shared';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { ContactGroupAccessGuard } from '@/auth/guards/contact-group-access.guard';
import { ContactAccessGuard } from '@/auth/guards/contact-access.guard';
import { User } from '@/generated/prisma/client';
import { ContactBookService } from './contact-book.service';

@ApiTags('contact-book')
@ApiBearerAuth('JWT-auth')
@Controller('contact-book')
export class ContactBookController {
  private readonly logger = new Logger(ContactBookController.name);
  constructor(private readonly contactBookService: ContactBookService) {}

  // ============ GROUPS ============

  @Post('groups')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new contact group' })
  @ApiBody({ type: CreateContactGroupDto })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  createGroup(@CurrentUser() user: User, @Body() dto: CreateContactGroupDto) {
    return this.contactBookService.createGroup(dto, user.commitment);
  }

  @Get('groups')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all contact groups for an account' })
  @ApiQuery({ name: 'accountId', required: true, description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'List of contact groups' })
  @ApiResponse({ status: 400, description: 'accountId is required' })
  getGroups(@CurrentUser() user: User, @Query('accountId') accountId: string) {
    if (!accountId) {
      throw new BadRequestException('accountId is required');
    }
    return this.contactBookService.getGroups(accountId, user.commitment);
  }

  @Get('groups/:id')
  @UseGuards(JwtAuthGuard, ContactGroupAccessGuard)
  @ApiOperation({ summary: 'Get a single contact group by ID' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Group found' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  getGroup(@Param('id') id: string) {
    return this.contactBookService.getGroup(id);
  }

  @Patch('groups/:id')
  @UseGuards(JwtAuthGuard, ContactGroupAccessGuard)
  @ApiOperation({ summary: 'Update a contact group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({ type: UpdateContactGroupDto })
  @ApiResponse({ status: 200, description: 'Group updated successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  updateGroup(@Param('id') id: string, @Body() dto: UpdateContactGroupDto) {
    return this.contactBookService.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  @UseGuards(JwtAuthGuard, ContactGroupAccessGuard)
  @ApiOperation({ summary: 'Delete a contact group' })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Group deleted successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  deleteGroup(@Param('id') id: string) {
    return this.contactBookService.deleteGroup(id);
  }

  // ============ CONTACTS ============

  @Post('contacts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiBody({ type: CreateContactDto })
  @ApiResponse({ status: 201, description: 'Contact created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  createContact(@CurrentUser() user: User, @Body() dto: CreateContactDto) {
    this.logger.log(`Creating contact for user ${user.commitment}`);
    this.logger.log(`Creating contact for user ${user.id}`);
    return this.contactBookService.createContact(dto, user.commitment);
  }

  @Get('contacts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all contacts for an account' })
  @ApiQuery({ name: 'accountId', required: true, description: 'Account ID' })
  @ApiQuery({
    name: 'groupId',
    required: false,
    description: 'Filter by group ID',
  })
  @ApiResponse({ status: 200, description: 'List of contacts' })
  @ApiResponse({ status: 400, description: 'accountId is required' })
  getContacts(
    @CurrentUser() user: User,
    @Query('accountId') accountId: string,
    @Query('groupId') groupId?: string,
  ) {
    if (!accountId) {
      throw new BadRequestException('accountId is required');
    }
    this.logger.log(`Getting contacts for user ${user.commitment}`);
    this.logger.log(`Getting contacts for user ${user.id}`);
    return this.contactBookService.getContacts(
      accountId,
      user.commitment,
      groupId,
    );
  }

  @Get('contacts/:id')
  @UseGuards(JwtAuthGuard, ContactAccessGuard)
  @ApiOperation({ summary: 'Get a single contact by ID' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact found' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  getContact(@Param('id') id: string) {
    return this.contactBookService.getContact(id);
  }

  @Patch('contacts/:id')
  @UseGuards(JwtAuthGuard, ContactAccessGuard)
  @ApiOperation({ summary: 'Update a contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiBody({ type: UpdateContactDto })
  @ApiResponse({ status: 200, description: 'Contact updated successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  updateContact(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactBookService.updateContact(id, dto);
  }

  @Delete('contacts/:id')
  @UseGuards(JwtAuthGuard, ContactAccessGuard)
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  deleteContact(@Param('id') id: string) {
    return this.contactBookService.deleteContact(id);
  }
}
