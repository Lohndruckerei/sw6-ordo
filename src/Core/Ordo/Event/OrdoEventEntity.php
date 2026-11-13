<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Core\Ordo\Event;

use Lohndruckerei\Ordo\Core\Ordo\Order\OrdoOrderEntity;
use Shopware\Core\Framework\DataAbstractionLayer\Entity;
use Shopware\Core\Framework\DataAbstractionLayer\EntityIdTrait;

class OrdoEventEntity extends Entity
{
    use EntityIdTrait;

    protected string $ordoOrderId;
    protected ?string $positionId = null;
    protected string $type;
    protected ?string $message = null;
    /** @var array<string, mixed>|null */
    protected ?array $payload = null;
    protected ?string $userId = null;
    protected ?string $userName = null;
    protected ?OrdoOrderEntity $ordoOrder = null;

    public function getOrdoOrderId(): string { return $this->ordoOrderId; }
    public function setOrdoOrderId(string $ordoOrderId): void { $this->ordoOrderId = $ordoOrderId; }
    public function getPositionId(): ?string { return $this->positionId; }
    public function setPositionId(?string $positionId): void { $this->positionId = $positionId; }
    public function getType(): string { return $this->type; }
    public function setType(string $type): void { $this->type = $type; }
    public function getMessage(): ?string { return $this->message; }
    public function setMessage(?string $message): void { $this->message = $message; }
    /** @return array<string, mixed>|null */
    public function getPayload(): ?array { return $this->payload; }
    /** @param array<string, mixed>|null $payload */
    public function setPayload(?array $payload): void { $this->payload = $payload; }
    public function getUserId(): ?string { return $this->userId; }
    public function setUserId(?string $userId): void { $this->userId = $userId; }
    public function getUserName(): ?string { return $this->userName; }
    public function setUserName(?string $userName): void { $this->userName = $userName; }
    public function getOrdoOrder(): ?OrdoOrderEntity { return $this->ordoOrder; }
    public function setOrdoOrder(?OrdoOrderEntity $ordoOrder): void { $this->ordoOrder = $ordoOrder; }
}
