<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductResource\Pages;
use App\Models\Product;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

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
                Forms\Components\Select::make('artist_id')
                    ->relationship('artist', 'nickname')
                    ->label('販売アーティスト')
                    ->searchable()
                    ->required(),

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

                // 購入制限（お一人様何個まで）
                Forms\Components\TextInput::make('limit_per_user')
                    ->label('購入制限数')
                    ->numeric()
                    ->suffix('個')
                    ->helperText('※ 0または空欄で無制限'),

                // 画像URL
                Forms\Components\TextInput::make('image_url')
                    ->label('画像URL')
                    ->url()
                    ->columnSpanFull(),

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
                    ->searchable(),

                Tables\Columns\TextColumn::make('price')
                    ->label('価格')
                    ->money('JPY')
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
}