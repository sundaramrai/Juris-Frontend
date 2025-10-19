import { TestBed } from '@angular/core/testing';

import { TldService } from './tld.service';
import "jasmine";

describe('TldService', () => {
  let service: TldService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TldService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
