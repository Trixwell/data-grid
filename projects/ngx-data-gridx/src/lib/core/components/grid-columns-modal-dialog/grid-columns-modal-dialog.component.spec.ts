import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GridColumnsModalDialogComponent } from './grid-columns-modal-dialog.component';

describe('GridColumnsModalDialogComponent', () => {
  let component: GridColumnsModalDialogComponent;
  let fixture: ComponentFixture<GridColumnsModalDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridColumnsModalDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GridColumnsModalDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
