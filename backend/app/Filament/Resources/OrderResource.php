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
use pxlrbt\FilamentExcel\Actions\Tables\ExportBulkAction;
use pxlrbt\FilamentExcel\Exports\ExcelExport;
use pxlrbt\FilamentExcel\Columns\Column;

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
                Tables\Columns\TextColumn::make('user.nickname')
                    ->label('購入者')
                    ->searchable(),

                Tables\Columns\TextColumn::make('total_price')
                    ->money('JPY')
                    ->sortable()
                    ->label('金額'),

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
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                    
                    // ▼▼▼ ここに追加！CSVエクスポート機能 ▼▼▼
                    ExportBulkAction::make()
                        ->label('CSVエクスポート') // ボタンの表示名
                        ->exports([
                            ExcelExport::make()
                                ->fromTable()
                                ->withFilename('orders_' . date('Y-m-d') . '.csv')
                                ->withColumns([
                                    Column::make('id')->heading('注文ID'),
                                    Column::make('created_at')->heading('注文日時'),
                                    Column::make('user.real_name')->heading('購入者氏名'),
                                    Column::make('user.email')->heading('メールアドレス'),
                                    Column::make('total_price')->heading('合計金額'),
                                    Column::make('payment_method')->heading('決済方法'),
                                    Column::make('delivery_method')->heading('受取方法'),
                                    
                                    // 住所（JSONの場合は空の可能性もあるので考慮）
                                    Column::make('shipping_address')->heading('配送先JSON'), 
                                    
                                    // 購入商品（すべての商品名をカンマ区切りで1列に出力）
                                    Column::make('items')
                                        ->heading('購入商品')
                                        ->formatStateUsing(function ($record) {
                                            return $record->items->map(function ($item) {
                                                return $item->product_name . ' x' . $item->quantity;
                                            })->implode(', ');
                                        }),
                                ]),
                        ]),
                    // ▲▲▲ 追加終わり ▲▲▲
                ]),
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