<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // ログイン済みユーザーかどうかはミドルウェアでチェック済み。
        // ここでは一旦 true を返す。
        // (詳細な権限チェックはコントローラーで行う方針を踏襲)
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'name'           => ['required', 'string', 'max:255'],
            'description'    => ['required', 'string'],
            'price'          => ['required', 'integer', 'min:0'],
            'stock'          => ['required', 'integer', 'min:0'],
            'limit_per_user' => ['nullable', 'integer', 'min:1'],
            'image_url'      => ['nullable', 'string'],
        ];
    }
}
