export interface IUsersUpdate {
    email: string;
    passwordHash: string;
    fullName: string;
    avatarUrl: string | null;
}

export interface IUserUpdateOptional extends Partial<IUsersUpdate> { }