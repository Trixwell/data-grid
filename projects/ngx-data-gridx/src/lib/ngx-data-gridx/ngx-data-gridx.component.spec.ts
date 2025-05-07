import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxDataGridxComponent } from './ngx-data-gridx.component';

describe('NgxDataGridxComponent', () => {
  let component: NgxDataGridxComponent;
  let fixture: ComponentFixture<NgxDataGridxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxDataGridxComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgxDataGridxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
