import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {AppliedFiltersDTO} from '../../ngx-data-gridx/ngx-data-gridx.component';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  constructor(protected http: HttpClient) {}

  public saveFilters(showHistoryFilters: boolean,
                      storageKey: string,
                      appliedFilters: Record<string, Record<string, AppliedFiltersDTO>>,
                      searchValues: Record<string, string>
  ): void {
    if (!showHistoryFilters) return;

    try {
      const raw = localStorage.getItem(storageKey);
      const prev = raw ? JSON.parse(raw) : {};

      const next = {
        ...prev,
        filters: appliedFilters,
        search:  searchValues,
      };

      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (e) {
      console.error(e);
    }
  }


}
