<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // ログイン済みユーザーなら誰でも更新リクエストは許可する
        // デフォルトの false だと 403 Forbidden になるので注意
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'real_name'     => ['required', 'string', 'max:255'],
            'nickname'      => [
                'required',
                'string',
                'max:255',
                // 自分のID (this->user()->id) は重複チェックから除外する
                Rule::unique('users')->ignore($this->user()->id),
            ],
            'phone_number'  => ['nullable', 'string', 'max:20'],
            'postal_code'   => ['nullable', 'string', 'max:8'],
            'prefecture'    => ['nullable', 'string', 'max:10'],
            'city'          => ['nullable', 'string', 'max:50'],
            'address_line1' => ['nullable', 'string', 'max:255'],
            'address_line2' => ['nullable', 'string', 'max:255'],
            'image_url'     => ['nullable', 'string'],
        ];
    }
}
