<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
{
    /**
     * ユーザーがこのリクエストを実行する権限があるか
     */
    public function authorize(): bool
    {
        // 認証済みのユーザーのみ許可 (ルートで middleware('auth') をかけていれば true でOK)
        return true;
    }

    /**
     * バリデーションルール
     */
    public function rules(): array
    {
        return [
            'product_id'      => ['required', 'integer', 'exists:products,id'],
            'quantity'        => ['required', 'integer', 'min:1'],
            'payment_method'  => ['required', 'string', Rule::in(['stripe', 'cash'])],
            'delivery_method' => ['required', 'string', Rule::in(['mail', 'venue'])],
        ];
    }

    /**
     * エラーメッセージのカスタマイズ (任意)
     */
    public function messages(): array
    {
        return [
            'product_id.exists' => '選択された商品は存在しません。',
            'quantity.min'      => '数量は1つ以上で指定してください。',
        ];
    }
}
