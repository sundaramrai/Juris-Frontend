import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { TldService } from './tld.service';

describe('TldService', () => {
  let service: TldService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TldService,
        provideHttpClient()
      ]
    });

    service = TestBed.inject(TldService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
