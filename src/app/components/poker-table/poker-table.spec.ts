import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PokerTable } from './poker-table';

describe('PokerTable', () => {
  let component: PokerTable;
  let fixture: ComponentFixture<PokerTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PokerTable],
    }).compileComponents();

    fixture = TestBed.createComponent(PokerTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
