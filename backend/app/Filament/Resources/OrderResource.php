<?php

namespace App\Filament\Resources;

use App\Filament\Resources\OrderResource\Pages;
use App\Filament\Resources\OrderResource\RelationManagers;
use App\Models\Order;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class OrderResource extends Resource
{
    protected static ?string $model = Order::class;

    protected static ?string $navigationIcon = 'heroicon-o-shopping-bag'; // アイコンをバッグに変更
    
    protected static ?string $navigationLabel = '注文・売上管理';

    // フォーム（編集画面）
    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                // ユーザーは変更できないようにする（閲覧のみ）
                Forms\Components\Select::make('user_id')
                    ->relationship('user', 'email') // メールアドレスを表示
                    ->disabled()
                    ->label('購入者'),

                // 合計金額
                Forms\Components\TextInput::make('total_price')
                    ->prefix('¥')
                    ->disabled()
                    ->label('合計金額'),

                // ステータス（ここは変更できるようにする）
                Forms\Components\Select::make('status')
                    ->options([
                        'pending' => '決済待ち',
                        'completed' => '完了',
                        'canceled' => 'キャンセル',
                        'refunded' => '返金済み',
                    ])
                    ->required()
                    ->label('ステータス'),
            ]);
    }

    // テーブル（一覧画面）
    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                // 購入者の名前（リレーション先のデータを表示）
                Tables\Columns\TextColumn::make('user.nickname')
                    ->label('購入者')
                    ->searchable(),

                Tables\Columns\TextColumn::make('total_price')
                    ->money('JPY') // 日本円表示にする
                    ->sortable()
                    ->label('金額'),

                // ステータスを色付きバッジで表示
                Tables\Columns\TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'pending' => 'warning',
                        'completed' => 'success',
                        'canceled', 'refunded' => 'danger',
                        default => 'gray',
                    })
                    ->label('状態'),

                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime('Y/m/d H:i')
                    ->sortable()
                    ->label('注文日時'),
            ])
            ->filters([
                // ステータスで絞り込み
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'completed' => '完了のみ',
                        'refunded' => '返金済み',
                    ]),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\DeleteBulkAction::make(),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\ItemsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListOrders::route('/'),
            'create' => Pages\CreateOrder::route('/create'),
            'edit' => Pages\EditOrder::route('/{record}/edit'),
        ];
    }
}