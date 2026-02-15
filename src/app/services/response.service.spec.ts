import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ResponseService } from './response.service';

describe('ResponseService', () => {
  let service: ResponseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ResponseService,
        provideHttpClient()
      ]
    });

    service = TestBed.inject(ResponseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
