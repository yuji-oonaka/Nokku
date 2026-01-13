<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * 誰でも登録リクエストは送れるので true にします
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     * ここにバリデーションルールを定義します
     */
    public function rules(): array
    {
        return [
            'real_name' => ['required', 'string', 'max:255'],
            'nickname'  => ['required', 'string', 'max:255', 'unique:users,nickname'],
        ];
    }
}
