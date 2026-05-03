
/**
 * Универсальный класс для обработки результатов операций.
 * Позволяет явно возвращать успех или ошибку без использования throw/catch.
 */
export class Result<T> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;
  public readonly error: string | null;
  private readonly _value: T | undefined;

  private constructor(isSuccess: boolean, error?: string | null, value?: T) {
    if (isSuccess && error) {
      throw new Error("InvalidOperation: A result cannot be successful and contain an error");
    }
    if (!isSuccess && !error) {
      throw new Error("InvalidOperation: A failing result needs to contain an error message");
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error || null;
    this._value = value;

    Object.freeze(this); // Делаем объект неизменяемым
  }

  /** Создает успешный результат с данными */
  public static success<U>(value: U): Result<U> {
    return new Result<U>(true, null, value);
  }

  /** Создает результат с ошибкой */
  public static failure<U>(error: string): Result<U> {
    return new Result<U>(false, error);
  }

  /** Получает значение (если успех) */
  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error("Cant retrieve the value from a failed result.");
    }
    return this._value!;
  }

  /** Получает текст ошибки (если провал) */
  public getErrorValue(): string {
    return this.error!;
  }
}