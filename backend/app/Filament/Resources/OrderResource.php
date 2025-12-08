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

    protected static ?string $navigationIcon = 'heroicon-o-shopping-bag';
    
    protected static ?string $navigationLabel = '注文・売上管理';

    protected static ?string $navigationGroup = '売上管理';
    protected static ?int $navigationSort = 1;

    // ★重要: 表示データの制限ロジック
    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();

        // 管理者(admin)はそのまま全件表示
        if (auth()->user()->role === 'admin') {
            return $query;
        }

        // アーティストは「自分の商品が含まれている注文」のみ表示
        return $query->whereHas('items.product', function ($q) {
            $q->where('artist_id', auth()->id());
        });
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                // ユーザー情報（閲覧のみ）
                Forms\Components\Select::make('user_id')
                    ->relationship('user', 'email')
                    ->disabled()
                    ->label('購入者'),

                // 合計金額
                Forms\Components\TextInput::make('total_price')
                    ->prefix('¥')
                    ->disabled()
                    ->label('合計金額'),

                // ステータス（変更可能）
                Forms\Components\Select::make('status')
                    ->options([
                        'pending' => '決済待ち',
                        'completed' => '完了',
                        'canceled' => 'キャンセル',
                        'refunded' => '返金済み',
                    ])
                    ->required()
                    ->label('ステータス'),

                Forms\Components\Section::make('配送情報')
                    ->schema([
                        Forms\Components\Select::make('delivery_method')
                            ->options([
                                'venue' => '会場受取',
                                'mail' => '配送',
                            ])
                            ->label('受取方法')
                            ->disabled(),

                        Forms\Components\TextInput::make('tracking_number')
                            ->label('追跡番号 (伝票番号)')
                            ->helperText('配送業者の問い合わせ番号を入力してください')
                            ->maxLength(255),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('user.nickname') // または real_name
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
                        'default' => 'gray',
                    })
                    ->label('状態'),

                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime('Y/m/d H:i')
                    ->sortable()
                    ->label('注文日時'),

                Tables\Columns\TextColumn::make('delivery_method')
                    ->label('受取')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'venue' => 'info',
                        'mail' => 'warning',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'venue' => '会場受取',
                        'mail' => '配送',
                        default => $state,
                    }),

                Tables\Columns\TextColumn::make('tracking_number')
                    ->label('追跡番号')
                    ->searchable()
                    ->copyable()
                    ->toggleable(isToggledHiddenByDefault: true),
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
                    
                    // CSVエクスポート
                    ExportBulkAction::make()
                        ->label('CSVエクスポート')
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
                                    Column::make('delivery_method')->heading('受取方法'),
                                    Column::make('shipping_address')->heading('配送先JSON'),
                                    
                                    // 購入商品列
                                    Column::make('items')
                                        ->heading('購入商品')
                                        ->formatStateUsing(function ($record) {
                                            return $record->items->map(function ($item) {
                                                return $item->product_name . ' x' . $item->quantity;
                                            })->implode(', ');
                                        }),
                                ]),
                        ]),
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