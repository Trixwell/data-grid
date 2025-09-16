import {Component, input, model} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {GridColumnsModalDialogComponent} from '../grid-columns-modal-dialog/grid-columns-modal-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {GridProperty} from '../../entity/grid-property';
import {GridTheme} from '../../../ngx-data-gridx/ngx-data-gridx.component';

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
  showPrint = input<boolean>(true);
  showColumnSettings = input<boolean>(true);
  storageKey = input<string>('');
  printData = input<(() => void) | null>(null);
  theme = input<GridTheme>();

  constructor(
    protected dialog: MatDialog
  ) {}

  showColumnSettingsModal(){
    const ref = this.dialog.open(GridColumnsModalDialogComponent, {
      width: '700px',
      maxWidth: 'none',
      data: { columns: this.columns, storageKey: this.storageKey() }
    });

    ref.afterClosed().subscribe((res: GridProperty[] | null) => {
      if (!res) return;
      if (!Array.isArray(res)) return;
      this.columns.set(res);
    });

    return this;
  }

  print(){
    const print = this.printData();
    if (print) {
      print();
    } else {
      window.print();
    }

    return this;
  }
}
