<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use App\Mail\ArtistInvitationMail;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Kreait\Firebase\Exception\Auth\EmailExists;
use Kreait\Firebase\Contract\Auth as FirebaseAuth;

class CreateUser extends CreateRecord
{
    protected static string $resource = UserResource::class;

    protected ?string $rawPassword = null;

    /**
     * データの作成前に実行される処理
     * ここでFirebaseにユーザーを作成し、UIDを取得します。
     */
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // ★追加: アーティストが作成する場合、雇用主ID(自分のID)をセットして紐付ける
        if (\Illuminate\Support\Facades\Auth::user()->role === 'artist') {
            $data['employer_id'] = \Illuminate\Support\Facades\Auth::id();
        }

        // パスワードが未入力なら自動生成
        if (empty($data['password'])) {
            $data['password'] = Str::random(12);
        }

        // メール送信用に生パスワードをプロパティに退避
        $this->rawPassword = $data['password'];

        // 1. Firebase Authのインスタンスを取得
        // (app('firebase.auth') でも動きますが、型安全のため Contract を使用推奨)
        $auth = app(FirebaseAuth::class);

        try {
            // 2. Firebaseでユーザーを作成
            $userProperties = [
                'email' => $data['email'],
                'emailVerified' => true, // 管理者作成なのでVerifiedとする
                'password' => $data['password'],
                'displayName' => $data['nickname'] ?? $data['real_name'],
                'disabled' => false,
            ];

            $createdUser = $auth->createUser($userProperties);

            // 3. 取得したUIDをデータに追加
            $data['firebase_uid'] = $createdUser->uid;
        } catch (EmailExists $e) {
            // すでにFirebaseにいる場合は、そのUIDを使って続行
            // ※ 万が一の不整合解消のため、既存UIDを紐付ける
            try {
                $existingUser = $auth->getUserByEmail($data['email']);
                $data['firebase_uid'] = $existingUser->uid;
            } catch (\Throwable $ex) {
                // 取得すらできない場合はエラー
                throw ValidationException::withMessages([
                    'email' => 'Firebase上の既存ユーザー情報の取得に失敗しました。',
                ]);
            }
        } catch (\Throwable $e) {
            // その他のエラー
            Log::error('Firebase作成エラー: ' . $e->getMessage());

            throw ValidationException::withMessages([
                'email' => 'Firebaseアカウントの作成に失敗しました: ' . $e->getMessage(),
            ]);
        }

        return $data;
    }

    protected function afterCreate(): void
    {
        // メールアドレスがあり、かつ生パスワードが確保できていれば処理
        if ($this->record->email && $this->rawPassword) {

            // ★重要: アーティストの場合のみ、既存の招待メールを送信
            if ($this->record->role === 'artist') {
                Mail::to($this->record->email)->send(
                    new ArtistInvitationMail($this->record, $this->rawPassword)
                );
            }

            // Staffの場合は、現時点ではメールを送らない (不適切な文面を防ぐため)
            // 将来的に StaffInvitationMail を作成した場合はここに分岐を追加します
        }
    }
}
