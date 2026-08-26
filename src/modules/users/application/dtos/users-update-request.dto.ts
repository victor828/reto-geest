import { IsEmail, IsOptional, IsString, IsStrongPassword, IsUrl } from "class-validator";

export class UsersUpdateRequestDto {
    @IsUrl()
    @IsString()
    @IsOptional()
    avatarUrl?: string;

    @IsEmail()
    @IsString()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    fullName?: string;

    @IsStrongPassword()
    @IsString()
    @IsOptional()
    passwordHash?: string;
}
