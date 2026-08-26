export abstract class AuthRepositoryPort {
  abstract createUser(user: any): Promise<any>;
  abstract login(id: string): Promise<any>;
}
