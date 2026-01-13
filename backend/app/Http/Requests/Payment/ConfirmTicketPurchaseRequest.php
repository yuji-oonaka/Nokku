<?php

namespace App\Http\Requests\Payment;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmTicketPurchaseRequest extends FormRequest
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
            'ticket_type_id'    => ['required', 'integer', 'exists:ticket_types,id'],
            'quantity'          => ['required', 'integer', 'min:1'],
            'stripe_payment_id' => ['required', 'string'],
        ];
    }
}
