<?php

namespace App\Http\Requests\UserTicket;

use Illuminate\Foundation\Http\FormRequest;

class ManualEnterRequest extends FormRequest
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
            'ticket_id' => ['required', 'integer', 'exists:user_tickets,id'],
        ];
    }
}
