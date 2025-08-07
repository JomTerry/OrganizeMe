declare module 'react-native-sqlite-storage' {
  export interface SQLiteDatabase {
    executeSql(
      sql: string,
      params?: any[],
      success?: (result: any) => void,
      error?: (error: any) => void
    ): Promise<[any]>;
    close(): Promise<void>;
  }

  export interface OpenDatabaseOptions {
    name: string;
    version?: string;
    displayName?: string;
    size?: number;
    location?: string;
  }

  export function openDatabase(options: OpenDatabaseOptions): Promise<SQLiteDatabase>;
  export function DEBUG(debug: boolean): void;
  export function enablePromise(enable: boolean): void;
}