import { TestBed } from '@angular/core/testing';

import { PlanningPoker } from './planning-poker';

describe('PlanningPoker', () => {
  let service: PlanningPoker;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlanningPoker);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
