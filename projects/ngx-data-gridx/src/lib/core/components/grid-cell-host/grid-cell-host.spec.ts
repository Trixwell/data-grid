import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GridCellHost } from './grid-cell-host';

describe('GridCellHost', () => {
  let component: GridCellHost;
  let fixture: ComponentFixture<GridCellHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridCellHost]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GridCellHost);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
