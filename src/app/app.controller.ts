import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {

    @Get()
    redirectTo() {
        return 'https://geest_frontend.veom.lat';
    }
}
