import { Test, TestingModule } from '@nestjs/testing';
import { RecurrencesService } from './recurrences.service';

describe('RecurrencesService', () => {
  let service: RecurrencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecurrencesService],
    }).compile();

    service = module.get<RecurrencesService>(RecurrencesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
