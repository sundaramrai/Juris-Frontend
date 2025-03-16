import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TldService {
  private tldUrl = 'https://data.iana.org/TLD/tlds-alpha-by-domain.txt'; // IANA TLD list URL

  constructor(private http: HttpClient) {}

  getTlds(): Observable<string[]> {
    return this.http.get(this.tldUrl, { responseType: 'text' }).pipe(
      map((data: string) => {
        // Extract TLDs from the response text
        return data.split('\n').filter(tld => tld.trim().length > 0 && !tld.startsWith('#'));
      })
    );
  }
}
