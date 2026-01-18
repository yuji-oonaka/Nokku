<?php

namespace App\Filament\Resources\InquiryResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;
use App\Models\Inquiry;

class ResponsesRelationManager extends RelationManager
{
    protected static string $relationship = 'responses';

    protected static ?string $title = 'メッセージ履歴'; // タブのタイトル
    protected static ?string $modelLabel = 'メッセージ'; // ボタンなどのラベル

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Textarea::make('body')
                    ->label('メッセージ本文')
                    ->required()
                    ->rows(4)
                    ->columnSpanFull()
                    ->maxLength(2000),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('id')
            ->columns([
                // 送信者の区別
                Tables\Columns\TextColumn::make('is_admin')
                    ->label('送信者')
                    ->badge()
                    ->formatStateUsing(fn(bool $state): string => $state ? '運営・主催者' : 'ユーザー')
                    ->color(fn(bool $state): string => $state ? 'info' : 'gray')
                    ->sortable(),

                // メッセージ本文
                Tables\Columns\TextColumn::make('body')
                    ->label('内容')
                    ->wrap() // 長い文章は折り返す
                    ->limit(100), // 一覧では100文字まで

                // 送信日時
                Tables\Columns\TextColumn::make('created_at')
                    ->label('送信日時')
                    ->dateTime('Y/m/d H:i')
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'asc') // チャットのように古い順(上から)に表示
            ->headerActions([
                Tables\Actions\CreateAction::make()
                    ->label('返信を作成')
                    ->icon('heroicon-m-paper-airplane')

                    // フォーム送信前のデータ加工
                    ->mutateFormDataUsing(function (array $data): array {
                        $data['user_id'] = Auth::id(); // 操作している管理者のID
                        $data['is_admin'] = true;      // 運営フラグをON
                        return $data;
                    })

                    // 送信後の処理（親のステータス更新）
                    ->after(function (RelationManager $livewire) {
                        // 親のお問い合わせモデルを取得
                        $inquiry = $livewire->getOwnerRecord();

                        // もし「解決済み」や「未対応」なら「対応中」に戻す
                        if ($inquiry->status !== 'in_review') {
                            $inquiry->update(['status' => 'in_review']);
                        }
                    }),
            ])
            ->actions([
                // 誤送信時のための編集・削除機能
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }
}
