<?php

namespace App\Filament\Resources;

use App\Filament\Resources\InquiryResource\Pages;
use App\Filament\Resources\InquiryResource\RelationManagers;
use App\Models\Inquiry;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class InquiryResource extends Resource
{
    protected static ?string $model = Inquiry::class;

    protected static ?string $navigationIcon = 'heroicon-o-chat-bubble-left-right';
    protected static ?string $navigationLabel = 'お問い合わせ';
    protected static ?string $modelLabel = 'お問い合わせ';
    protected static ?string $slug = 'inquiries';
    protected static ?int $navigationSort = 10;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                // --- 左カラム: 問い合わせ内容 ---
                Forms\Components\Section::make('問い合わせ内容')
                    ->schema([
                        Forms\Components\TextInput::make('subject')
                            ->label('件名')
                            ->required()
                            ->columnSpanFull(),

                        Forms\Components\Textarea::make('message')
                            ->label('本文')
                            ->rows(5)
                            ->columnSpanFull(),

                        // ポリモーフィックな対象情報を表示するためのプレースホルダー
                        Forms\Components\Placeholder::make('target_info')
                            ->label('関連データ')
                            ->content(function (Inquiry $record) {
                                if (!$record->target) return 'なし';
                                // クラス名から短い名前を取得 (App\Models\Event -> Event)
                                $type = class_basename($record->target_type);
                                $name = match ($type) {
                                    'Event' => $record->target->title ?? '不明なイベント',
                                    'Product' => $record->target->name ?? '不明なグッズ',
                                    'Order' => '注文ID: ' . $record->target->id,
                                    'User' => $record->target->nickname ?? '不明なユーザー',
                                    default => 'ID: ' . $record->target_id
                                };
                                return "{$type}: {$name}";
                            }),
                    ])->columnSpan(2),

                // --- 右カラム: 管理情報 ---
                Forms\Components\Section::make('ステータス管理')
                    ->schema([
                        Forms\Components\Select::make('status')
                            ->label('対応状況')
                            ->options([
                                'open' => '未対応',
                                'in_review' => '対応中',
                                'closed' => '解決済み',
                            ])
                            ->required()
                            ->native(false),

                        Forms\Components\Select::make('user_id')
                            ->label('送信者')
                            ->relationship('user', 'nickname')
                            ->searchable()
                            ->disabled(), // 基本的に変更不可

                        Forms\Components\Select::make('organizer_id')
                            ->label('対応担当者')
                            ->relationship('organizer', 'nickname')
                            ->searchable()
                            ->helperText('空欄の場合は運営預かりとなります'),

                        Forms\Components\Toggle::make('is_escalated')
                            ->label('運営エスカレーション')
                            ->onColor('danger')
                            ->offColor('gray'),

                        Forms\Components\Textarea::make('escalation_reason')
                            ->label('エスカレーション理由')
                            ->visible(fn(Forms\Get $get) => $get('is_escalated'))
                            ->columnSpanFull(),

                        Forms\Components\DateTimePicker::make('created_at')
                            ->label('受信日時')
                            ->disabled(),

                        Forms\Components\DateTimePicker::make('closed_at')
                            ->label('解決日時')
                            ->disabled(),
                    ])->columnSpan(1),
            ])->columns(3);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->sortable(),

                Tables\Columns\TextColumn::make('status')
                    ->label('状態')
                    ->badge()
                    ->formatStateUsing(fn(string $state): string => match ($state) {
                        'open' => '未対応',
                        'in_review' => '対応中',
                        'closed' => '解決済み',
                    })
                    ->color(fn(string $state): string => match ($state) {
                        'open' => 'danger',
                        'in_review' => 'warning',
                        'closed' => 'success',
                    }),

                Tables\Columns\TextColumn::make('subject')
                    ->label('件名')
                    ->searchable()
                    ->limit(30),

                Tables\Columns\TextColumn::make('user.nickname')
                    ->label('送信者')
                    ->searchable(),

                // 関連データの表示ロジック
                Tables\Columns\TextColumn::make('target_type')
                    ->label('関連')
                    ->formatStateUsing(function ($state, Inquiry $record) {
                        if (!$record->target) return '-';
                        return class_basename($state); // Event, Orderなどを表示
                    })
                    ->badge()
                    ->color('gray'),

                Tables\Columns\IconColumn::make('is_escalated')
                    ->label('運営管理')
                    ->boolean()
                    ->trueIcon('heroicon-o-exclamation-triangle')
                    ->trueColor('danger')
                    ->falseIcon(''), // falseの時は表示しない

                Tables\Columns\TextColumn::make('created_at')
                    ->label('受信日時')
                    ->dateTime('Y/m/d H:i')
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->label('ステータス')
                    ->options([
                        'open' => '未対応',
                        'in_review' => '対応中',
                        'closed' => '解決済み',
                    ]),
                Tables\Filters\TernaryFilter::make('is_escalated')
                    ->label('エスカレーション案件'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            // ★ここに返信管理用のリレーションマネージャーを登録
            RelationManagers\ResponsesRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListInquiries::route('/'),
            'create' => Pages\CreateInquiry::route('/create'),
            'edit' => Pages\EditInquiry::route('/{record}/edit'),
        ];
    }

    // 論理削除されたデータも表示できるようにする設定
    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([
                \Illuminate\Database\Eloquent\SoftDeletingScope::class,
            ]);
    }
}
