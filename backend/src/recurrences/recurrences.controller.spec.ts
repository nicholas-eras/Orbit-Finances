import { Test, TestingModule } from '@nestjs/testing';
import { RecurrencesController } from './recurrences.controller';
import { RecurrencesService } from './recurrences.service';

describe('RecurrencesController', () => {
  let controller: RecurrencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecurrencesController],
      providers: [RecurrencesService],
    }).compile();

    controller = module.get<RecurrencesController>(RecurrencesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
