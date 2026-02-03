<?php

namespace App\Filament\Resources;

use App\Filament\Resources\LoginBonusConfigResource\Pages;
use App\Models\LoginBonusConfig;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class LoginBonusConfigResource extends Resource
{
    protected static ?string $model = LoginBonusConfig::class;

    protected static ?string $navigationLabel = 'ログインボーナス設定';
    protected static ?string $navigationGroup = 'システム管理';
    protected static ?string $navigationIcon = 'heroicon-o-gift';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('ログインボーナス設定')
                    ->description('ユーザーが1日1回ログインした際に付与されるポイントを管理します。')
                    ->schema([
                        Forms\Components\TextInput::make('amount')
                            ->label('付与ポイント数')
                            ->numeric()
                            ->default(5)
                            ->suffix('pt')
                            ->required(),

                        Forms\Components\Toggle::make('is_active')
                            ->label('機能を有効にする')
                            ->helperText('オフにすると、ログインボーナスの付与が一時停止されます。')
                            ->default(true),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('amount')
                    ->label('付与ポイント数')
                    ->suffix(' pt')
                    ->badge()
                    ->color('success'),

                Tables\Columns\IconColumn::make('is_active')
                    ->label('ステータス')
                    ->boolean(),

                Tables\Columns\TextColumn::make('updated_at')
                    ->label('最終更新日')
                    ->dateTime('Y/m/d H:i')
                    ->color('gray'),
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            // ★ 設定データなので、新規作成や削除は行わせない（憲法：整合性維持のため）
            ->headerActions([])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListLoginBonusConfigs::route('/'),
            'edit' => Pages\EditLoginBonusConfig::route('/{record}/edit'),
        ];
    }

    // ★ ナビゲーションバッジに現在の設定ポイントを表示する（利便性向上）
    public static function getNavigationBadge(): ?string
    {
        return static::getModel()::first()?->amount . 'pt';
    }
}
