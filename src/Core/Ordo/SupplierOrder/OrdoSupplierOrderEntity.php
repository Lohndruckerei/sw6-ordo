<?php

declare(strict_types=1);

namespace Lohndruckerei\Ordo\Core\Ordo\SupplierOrder;

use Lohndruckerei\Ordo\Core\Ordo\Order\OrdoOrderEntity;
use Lohndruckerei\Ordo\Core\Ordo\Position\OrdoPositionCollection;
use Shopware\Core\Framework\DataAbstractionLayer\Entity;
use Shopware\Core\Framework\DataAbstractionLayer\EntityIdTrait;

class OrdoSupplierOrderEntity extends Entity
{
    use EntityIdTrait;

    protected string $ordoOrderId;
    protected string $supplierId;
    protected ?string $supplierNumber = null;
    protected ?string $supplierName = null;
    protected string $number;
    protected string $status;
    protected ?bool $partial = false;
    protected ?\DateTimeInterface $deliveryDate = null;
    protected ?string $interfaceName = null;
    protected ?string $transport = null;
    protected ?string $resultMessage = null;
    /** @var list<string>|null */
    protected ?array $lineItemIds = null;
    /** @var array<string, mixed>|null */
    protected ?array $payload = null;
    protected ?\DateTimeInterface $sentAt = null;
    protected ?string $userName = null;
    protected ?OrdoOrderEntity $ordoOrder = null;
    protected ?OrdoPositionCollection $positions = null;

    public function getOrdoOrderId(): string { return $this->ordoOrderId; }
    public function getSupplierId(): string { return $this->supplierId; }
    public function getSupplierNumber(): ?string { return $this->supplierNumber; }
    public function getSupplierName(): ?string { return $this->supplierName; }
    public function getNumber(): string { return $this->number; }
    public function getStatus(): string { return $this->status; }
    public function isPartial(): bool { return (bool) $this->partial; }
    public function getDeliveryDate(): ?\DateTimeInterface { return $this->deliveryDate; }
    public function getInterfaceName(): ?string { return $this->interfaceName; }
    public function getTransport(): ?string { return $this->transport; }
    public function getResultMessage(): ?string { return $this->resultMessage; }
    /** @return list<string> */
    public function getLineItemIds(): array { return $this->lineItemIds ?? []; }
    /** @return array<string, mixed>|null */
    public function getPayload(): ?array { return $this->payload; }
    public function getSentAt(): ?\DateTimeInterface { return $this->sentAt; }
    public function getUserName(): ?string { return $this->userName; }
    public function getOrdoOrder(): ?OrdoOrderEntity { return $this->ordoOrder; }
    public function getPositions(): ?OrdoPositionCollection { return $this->positions; }
}
