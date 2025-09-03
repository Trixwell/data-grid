import {Component, model} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {GridColumnsModalDialogComponent} from '../grid-columns-modal-dialog/grid-columns-modal-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {GridProperty} from '../../entity/grid-property';

@Component({
  selector: 'grid-footer-settings',
  imports: [
    MatIcon,
  ],
  templateUrl: './grid-footer-settings.component.html',
  styleUrl: './grid-footer-settings.component.scss'
})
export class GridFooterSettingsComponent {
  columns = model<GridProperty[]>();

  constructor(
    protected dialog: MatDialog
  ) {}

  showColumnSettingsModal(){
    this.dialog.open(GridColumnsModalDialogComponent, {
      width: '700px',
      maxWidth: 'none',
      data: { columns: this.columns }
    });
  }
}
