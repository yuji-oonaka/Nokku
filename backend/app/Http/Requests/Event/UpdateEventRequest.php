<?php

namespace App\Http\Requests\Event;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEventRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'venue'       => ['required', 'string', 'max:255'],
            // 更新時は日付の変更が可能だが、after:nowをつけるかは仕様次第。
            // 開催直前の微修正も考慮し、単に valid date であることのみチェックする
            'event_date'  => ['required', 'date'],
            'image_url'   => ['nullable', 'string'],
        ];
    }
}
