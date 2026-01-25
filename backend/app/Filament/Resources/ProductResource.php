<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductResource\Pages;
use App\Models\Product;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

class ProductResource extends Resource
{
    protected static ?string $model = Product::class;

    protected static ?string $navigationIcon = 'heroicon-o-tag'; // アイコンをタグに変更

    protected static ?string $navigationLabel = 'グッズ管理';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                // 出品アーティスト
                /** @var \App\Models\User|null $user */
                Forms\Components\Select::make('artist_id')
                    ->relationship('artist', 'nickname')
                    ->label('販売アーティスト')
                    ->searchable()
                    ->required()
                    // ★修正: 型安全なメソッドを使用し、管理者以外は編集不可
                    ->disabled(function () {
                        /** @var \App\Models\User|null $user */
                        $user = Auth::user();
                        return !($user instanceof \App\Models\User && $user->isAdmin());
                    })
                    ->default(fn () => Auth::id())
                    ->dehydrated(),

                Forms\Components\TextInput::make('name')
                    ->label('商品名')
                    ->required()
                    ->maxLength(255),

                // 金額入力
                Forms\Components\TextInput::make('price')
                    ->label('価格')
                    ->required()
                    ->numeric()
                    ->prefix('¥')
                    ->minValue(0),

                Forms\Components\TextInput::make('stock')
                    ->label('在庫数')
                    ->required()
                    ->numeric()
                    ->default(0)
                    ->minValue(0),

                // 購入制限（お一人様何個まで）
                Forms\Components\TextInput::make('limit_per_user')
                    ->label('購入制限数')
                    ->numeric()
                    ->suffix('個')
                    ->helperText('※ 0または空欄で無制限'),

                // 画像URL
                Forms\Components\FileUpload::make('image_url')
                    ->label('グッズ画像')
                    ->image()
                    ->directory('products')
                    ->disk('public')
                    ->visibility('public')
                    ->formatStateUsing(function ($record) {
                        if (!$record || !$record->getRawOriginal('image_url')) {
                            return [];
                        }
                        $url = $record->getRawOriginal('image_url');
                        if (str_starts_with($url, 'http')) {
                            return [];
                        }
                        return [$url];
                    }),

                Forms\Components\Textarea::make('description')
                    ->label('商品説明')
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('image_url')
                    ->label('画像')
                    ->square(),

                Tables\Columns\TextColumn::make('name')
                    ->label('商品名')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('artist.nickname')
                    ->label('販売アーティスト')
                    ->searchable()
                    ->visible(fn () => Auth::user()->role === 'admin'),

                Tables\Columns\TextColumn::make('price')
                    ->label('価格')
                    ->money('JPY')
                    ->sortable(),

                Tables\Columns\TextColumn::make('stock')
                    ->label('在庫')
                    ->numeric()
                    ->sortable(),

                Tables\Columns\TextColumn::make('limit_per_user')
                    ->label('購入制限')
                    ->formatStateUsing(fn ($state) => $state ? "{$state}個まで" : '無制限')
                    ->sortable(),
            ])
            ->filters([
                //
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
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListProducts::route('/'),
            'create' => Pages\CreateProduct::route('/create'),
            'edit' => Pages\EditProduct::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::user();
        $query = parent::getEloquentQuery();

        // ログインしていない、または正しいユーザーモデルでない場合は空を返す
        if (!$user instanceof \App\Models\User) {
            return $query->whereRaw('1 = 0');
        }

        // 管理者は全件表示
        if ($user->isAdmin()) {
            return $query;
        }

        // アーティストは「自分の商品」のみ表示
        if ($user->isArtist()) {
            return $query->where('artist_id', $user->id);
        }

        // それ以外（Staff/Operatorなど）は、物理的にUIを遮断するため0件にする
        return $query->whereRaw('1 = 0');
    }
}