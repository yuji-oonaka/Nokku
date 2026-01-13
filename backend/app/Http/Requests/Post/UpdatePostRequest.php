<?php

namespace App\Http\Requests\Post;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePostRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // ここで権限チェックも可能ですが、現状のコントローラーのロジックを
        // 尊重し、一旦 true にしてコントローラー側でチェックさせます。
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'title'      => ['required', 'string', 'max:255'],
            'content'    => ['required', 'string', 'max:1000'],
            'image_url'  => ['nullable', 'string', 'url'],
            'publish_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after_or_equal:publish_at'],
        ];
    }
}
