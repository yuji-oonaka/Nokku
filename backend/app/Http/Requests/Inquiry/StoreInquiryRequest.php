<?php

namespace App\Http\Requests\Inquiry;

use App\Models\Event;
use App\Models\User;
use App\Models\Order; // ★追加
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInquiryRequest extends FormRequest
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
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],

            // ★ 'order' をリストに追加
            'target_type' => ['nullable', 'string', Rule::in(['event', 'user', 'app', 'order'])],

            'target_id' => [
                'nullable',
                'integer',
                'required_with:target_type',
                function ($attribute, $value, $fail) {
                    $type = $this->input('target_type');
                    if (!$type || $type === 'app') return;

                    $modelClass = match ($type) {
                        'event' => Event::class,
                        'user'  => User::class,
                        'order' => Order::class, // ★追加
                        default => null,
                    };

                    if ($modelClass && !$modelClass::where('id', $value)->exists()) {
                        $fail("選択された対象が存在しません。");
                    }
                },
            ],
        ];
    }

    /**
     * バリデーション完了後のデータ整形
     */
    public function passedValidation()
    {
        if ($this->target_type && $this->target_type !== 'app') {
            $modelClass = match ($this->target_type) {
                'event' => Event::class,
                'user'  => User::class,
                'order' => Order::class, // ★追加
                default => null,
            };

            $this->merge([
                'target_type' => $modelClass,
            ]);
        } else {
            $this->merge([
                'target_type' => null,
                'target_id' => null,
            ]);
        }
    }
}
