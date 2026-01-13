<?php

namespace App\Http\Requests\Image;

use Illuminate\Foundation\Http\FormRequest;

class StoreImageRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // ログイン済みユーザーであればアップロード許可
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'image' => [
                'required',
                'file',                        // アップロード成功確認
                'image',                       // 画像バイナリチェック (PHP getimagesize)
                'mimes:jpeg,png,jpg,gif,webp', // 許可拡張子 (SVGはXSSリスクのため禁止)
                'max:5120',                    // 5MB制限
            ],
            'type' => ['required', 'string', 'in:product,event,avatar,post'],
        ];
    }
}
