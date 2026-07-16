import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { ChangePasswordDto, UpdateProfileDto } from './dto/users.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.usersService.getProfile(user.userId);
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Post('me/password')
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.userId, dto);
  }
}
