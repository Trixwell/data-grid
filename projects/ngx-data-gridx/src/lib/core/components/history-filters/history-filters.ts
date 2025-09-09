import {Component, input, model} from '@angular/core';
import {InvokeBtnComponent} from '../invoke-btn/invoke-btn.component';
import {AppliedFiltersDTO} from '../../../ngx-data-gridx/ngx-data-gridx.component';
import {GridProperty} from '../../entity/grid-property';
import {Subject} from 'rxjs';
import {FormGroup} from '@angular/forms';
import {UtilsService} from '../../services/utils.service';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'history-filters',
  imports: [
    InvokeBtnComponent,
    MatIcon
  ],
  templateUrl: './history-filters.html',
  styleUrl: './history-filters.scss',
})
export class HistoryFilters {
  appliedFilters = model<Record<string, Record<string, AppliedFiltersDTO>>>({});
  searchValues   = model<Record<string, string>>({});
  data           = model<GridProperty[]>([]);
  searchSubject  = model.required<Subject<Record<string, string>>>();
  dateFilters    = model<Record<string, FormGroup>>({});
  storageKey     = input.required<string>();
  loadData       = input<(page?: number, limit?: number) => void>(() => {});
  limit          = input.required<number>();

  constructor(protected utilsService: UtilsService) {}

  getAppliedFilters(): AppliedFiltersDTO[] {
    const result: AppliedFiltersDTO[] = [];

    Object.keys(this.appliedFilters()).forEach((colName) => {
      const filters = this.appliedFilters()[colName];
      Object.keys(filters).forEach((filterType) => {
        const filterObj: AppliedFiltersDTO = filters[filterType];

        if (Array.isArray(filterObj.label) && Array.isArray(filterObj.value)) {
          filterObj.label.forEach((lbl: string, index: number) => {
            const value = Array.isArray(filterObj.value) ? filterObj.value[index]?.toString() : filterObj.value.toString();
            result.push({
              column: colName,
              filterType: filterType,
              value: value,
              label: lbl
            });
          });
        } else {
          result.push({
            column: colName,
            filterType: filterType,
            value: filterObj.value?.toString(),
            label: filterObj.label?.toString()
          });
        }
      });
    });

    Object.keys(this.searchValues()).forEach((colName) => {
      const column = this.data().find(col => col.name === colName);
      if (this.searchValues()[colName]) {
        result.push({
          column: colName,
          filterType: 'input',
          value: this.searchValues()[colName],
          label: `Пошук по ${column?.displayName || colName}: "${this.searchValues()[colName]?.length > 50
            ? this.searchValues()[colName].slice(0, 50) + '...'
            : this.searchValues()[colName]}"`
        });
      }
    });

    return result;
  }

  clearFilter(
    columnName: string | undefined,
    filterType: string | undefined,
    optionValue:  string | number | string[]
  ) {

    if (filterType === 'input' && columnName && this.searchValues()[columnName]) {
      delete this.searchValues()[columnName];
      this.utilsService.saveFilters(
        true,
        this.storageKey(),
        this.appliedFilters(),
        this.searchValues()
      );
      this.searchSubject().next({ ...this.searchValues() });
    }

    if (!columnName || !filterType || !this.appliedFilters()[columnName] || !this.appliedFilters()[columnName][filterType]) {
      return;
    }

    const filterObj : AppliedFiltersDTO = this.appliedFilters()[columnName][filterType];
    const column: GridProperty | undefined = this.data().find(col => col.name === columnName);

    if (Array.isArray(filterObj.value) && Array.isArray(filterObj.label)) {
      if (typeof optionValue === "string") {
        const index = filterObj.value
          .map(String)
          .indexOf(String(optionValue));

        if (index !== -1) {
          filterObj.value.splice(index, 1);
          filterObj.label.splice(index, 1);
        }

        if (filterObj.value.length === 0) {
          delete this.appliedFilters()[columnName][filterType];

          if (Object.keys(this.appliedFilters()[columnName]).length === 0) {
            delete this.appliedFilters()[columnName];
          }
        }
      }
    } else {
      delete this.appliedFilters()[columnName][filterType];

      if (Object.keys(this.appliedFilters()[columnName]).length === 0) {
        delete this.appliedFilters()[columnName];
      }
    }

    if (filterType === 'date' && this.dateFilters()[columnName]) {
      this.dateFilters()[columnName].patchValue({ start: null, end: null });
      this.dateFilters()[columnName].reset();
    }


    this.uncheckedCheckbox(column, filterType, optionValue);
    this.utilsService.saveFilters(
      true,
      this.storageKey(),
      this.appliedFilters(),
      this.searchValues()
    );
    this.loadData()(1, this.limit());
  }

  clearAllFilters(){
    this.appliedFilters.set({});
    this.searchValues.set({});

    this.data().forEach((column) => {
      if (column.filterValues) {
        column.filterValues.forEach((group) => {
          group.forEach((filterItem) => filterItem.selected = false);
        });
      }
    });

    Object.keys(this.dateFilters()).forEach((key) => {
      this.dateFilters()[key].patchValue({ start: null, end: null, date: null });
      this.dateFilters()[key].reset();
    });

    this.utilsService.saveFilters(
      true,
      this.storageKey(),
      this.appliedFilters(),
      this.searchValues()
    );
    this.loadData()(1, this.limit());
  }

  private uncheckedCheckbox(column: GridProperty | undefined,
                            filterType: string,
                            value: string | string[] | number
  ){
    if (column && column.filterValues && filterType === "checkbox") {
      column.filterValues.forEach(group => {
        group.forEach(filterItem => {
          if (filterItem.value === value) {
            filterItem.selected = false;
          }
        });
      });
    }

    return this;
  }
}
