import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiSearch } from './multi-search';

describe('MultiSearch', () => {
  let component: MultiSearch;
  let fixture: ComponentFixture<MultiSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiSearch]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultiSearch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
