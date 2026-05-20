import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TldService {
  private readonly tldUrl = 'https://data.iana.org/TLD/tlds-alpha-by-domain.txt';
  private readonly http = inject(HttpClient);

  getTlds(): Observable<string[]> {
    return this.http.get(this.tldUrl, { responseType: 'text' }).pipe(
      map((data: string) => {
        return data.split('\n').filter(tld => tld.trim().length > 0 && !tld.startsWith('#'));
      })
    );
  }
}
