<?php

namespace App\Http\Requests\Event;

use Illuminate\Foundation\Http\FormRequest;

class StoreEventRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // 権限チェックはPolicyで行うためtrue
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
            // 新規作成時は必ず未来の日付であること
            'event_date'  => ['required', 'date', 'after:now'],
            'image_url'   => ['nullable', 'string'],
        ];
    }
}
