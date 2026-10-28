import { type FormEvent, useState } from "react";
import { Button } from "#/components/ui/Button";
import { Dialog } from "#/components/ui/Dialog";
import { Field, TextInput } from "#/components/ui/Field";
import { Tabs } from "#/components/ui/Tabs";
import {
	type CnpjLookup,
	type ManualLeadInput,
	useCnpjLookup,
	useCreateManualLead,
} from "#/features/leads-pool/api";
import {
	COMPANY_SIZE_OPTIONS,
	onlyDigits,
	type PoolLeadItem,
	SECTOR_OPTIONS,
} from "#/features/leads-pool/data";
import { ApiError } from "#/lib/api";

export interface LeadFormDialogProps {
	open: boolean;
	onClose: () => void;
	/** Chamado depois que `POST /leads/manual` responde com o lead criado. */
	onCreated?: (lead: PoolLeadItem) => void;
}

type PersonType = "PJ" | "PF";

/** Texto opcional: devolve `undefined` em vez de string vazia no payload. */
function optional(value: string): string | undefined {
	const trimmed = value.trim();

	return trimmed === "" ? undefined : trimmed;
}

function errorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		return error.message;
	}

	return "Não foi possível salvar o lead. Tente de novo.";
}

/**
 * Formulário único de cadastro de lead (Pool e topbar).
 *
 * Preenche à mão ou importa os dados da Receita pelo CNPJ e envia
 * `POST /leads/manual` no contrato real (`snake_case`).
 */
export function LeadFormDialog({
	open,
	onClose,
	onCreated,
}: LeadFormDialogProps) {
	const [tipo, setTipo] = useState<PersonType>("PJ");
	const [documento, setDocumento] = useState("");
	const [companyName, setCompanyName] = useState("");
	const [tradeName, setTradeName] = useState("");
	const [primaryCnae, setPrimaryCnae] = useState("");
	const [cnaeDescription, setCnaeDescription] = useState("");
	const [capitalSocial, setCapitalSocial] = useState("");
	const [postalCode, setPostalCode] = useState("");
	const [street, setStreet] = useState("");
	const [number, setNumber] = useState("");
	const [complement, setComplement] = useState("");
	const [neighborhood, setNeighborhood] = useState("");
	const [city, setCity] = useState("");
	const [state, setState] = useState("");
	const [sector, setSector] = useState("");
	const [companySize, setCompanySize] = useState("");
	const [temperature, setTemperature] = useState("");
	const [contactName, setContactName] = useState("");
	const [contactRole, setContactRole] = useState("");
	const [contactPhone, setContactPhone] = useState("");
	const [contactEmail, setContactEmail] = useState("");
	const [birthday, setBirthday] = useState("");
	const [assignToMe, setAssignToMe] = useState(false);
	const [lookupStatus, setLookupStatus] = useState<string | null>(null);
	const [formError, setFormError] = useState<string | null>(null);

	const lookup = useCnpjLookup();
	const createLead = useCreateManualLead();

	function fillFromCnpj(data: CnpjLookup) {
		setCompanyName(data.company_name ?? "");
		setTradeName(data.trade_name ?? "");
		setPrimaryCnae(data.primary_cnae ?? "");
		setCnaeDescription(data.cnae_description ?? "");
		setCapitalSocial(
			data.capital_social === null ? "" : String(data.capital_social),
		);
		setPostalCode(data.postal_code ?? "");
		setStreet(data.street ?? "");
		setNumber(data.number ?? "");
		setComplement(data.complement ?? "");
		setNeighborhood(data.neighborhood ?? "");
		setCity(data.city ?? "");
		setState(data.state ?? "");
		setSector(data.sector ?? "");
		setCompanySize(data.company_size ?? "");

		const partner =
			data.contacts.find((contact) => contact.is_decision_maker) ??
			data.contacts[0];

		if (partner) {
			setContactName(partner.name);
			setContactRole(partner.role ?? "");
		}
	}

	function handleLookup() {
		const digits = onlyDigits(documento);

		setLookupStatus(null);
		setFormError(null);

		if (digits.length !== 14) {
			setFormError("Informe um CNPJ com 14 dígitos para consultar.");
			return;
		}

		lookup.mutate(documento, {
			onSuccess: (data) => {
				fillFromCnpj(data);
				setLookupStatus("Dados da Receita Federal carregados.");
			},
			onError: (error) => setFormError(errorMessage(error)),
		});
	}

	function reset() {
		setTipo("PJ");
		setDocumento("");
		setCompanyName("");
		setTradeName("");
		setPrimaryCnae("");
		setCnaeDescription("");
		setCapitalSocial("");
		setPostalCode("");
		setStreet("");
		setNumber("");
		setComplement("");
		setNeighborhood("");
		setCity("");
		setState("");
		setSector("");
		setCompanySize("");
		setTemperature("");
		setContactName("");
		setContactRole("");
		setContactPhone("");
		setContactEmail("");
		setBirthday("");
		setAssignToMe(false);
		setLookupStatus(null);
		setFormError(null);
	}

	function handleClose() {
		reset();
		onClose();
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFormError(null);

		const digits = onlyDigits(documento);
		const documentInvalid =
			tipo === "PJ" ? digits.length !== 14 : digits.length !== 11;

		if (documentInvalid) {
			setFormError(
				tipo === "PJ"
					? "Informe um CNPJ com 14 dígitos."
					: "Informe um CPF com 11 dígitos.",
			);
			return;
		}

		const payload: ManualLeadInput = {
			person_type: tipo,
			cnpj: tipo === "PJ" ? digits : undefined,
			cpf: tipo === "PF" ? digits : undefined,
			company_name: optional(companyName),
			trade_name: optional(tradeName),
			primary_cnae: optional(primaryCnae),
			cnae_description: optional(cnaeDescription),
			capital_social: capitalSocial === "" ? undefined : Number(capitalSocial),
			postal_code: optional(postalCode),
			street: optional(street),
			number: optional(number),
			complement: optional(complement),
			neighborhood: optional(neighborhood),
			city: optional(city),
			state: optional(state),
			sector: optional(sector),
			company_size: optional(companySize),
			temperature: optional(temperature),
			contacts: contactName.trim()
				? [
						{
							name: contactName.trim(),
							role: optional(contactRole),
							phone: optional(contactPhone),
							email: optional(contactEmail),
							birthday: optional(birthday),
							is_primary: true,
							is_decision_maker: true,
						},
					]
				: [],
			assign_to_me: assignToMe,
		};

		createLead.mutate(payload, {
			onSuccess: (lead) => {
				onCreated?.(lead);
				handleClose();
			},
			onError: (error) => setFormError(errorMessage(error)),
		});
	}

	return (
		<Dialog
			open={open}
			title="Novo lead"
			description="Cadastre manualmente ou importe os dados da Receita pelo CNPJ."
			onClose={handleClose}
			className="max-w-[680px]"
		>
			<form onSubmit={submit} className="grid gap-4">
				<Tabs
					value={tipo}
					onChange={(value) => {
						setTipo(value);
						setDocumento("");
						setLookupStatus(null);
					}}
					items={[
						{ value: "PJ", label: "Pessoa Jurídica (CNPJ)" },
						{ value: "PF", label: "Pessoa Física (CPF)" },
					]}
				/>
				{tipo === "PJ" ? (
					<div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
						<Field label="CNPJ">
							<TextInput
								required
								inputMode="numeric"
								placeholder="00.000.000/0000-00"
								value={documento}
								onChange={(event) => setDocumento(event.target.value)}
							/>
						</Field>
						<Button
							type="button"
							variant="success"
							className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
							disabled={lookup.isPending}
							onClick={handleLookup}
						>
							{lookup.isPending ? "Consultando…" : "🔍 Buscar CNPJ"}
						</Button>
					</div>
				) : (
					<Field label="CPF">
						<TextInput
							required
							inputMode="numeric"
							placeholder="000.000.000-00"
							value={documento}
							onChange={(event) => setDocumento(event.target.value)}
						/>
					</Field>
				)}
				{lookupStatus ? (
					<output className="rounded-xl border border-emerald-500 bg-emerald-50/70 p-3 text-xs font-semibold text-emerald-800">
						✓ {lookupStatus}
					</output>
				) : null}
				<Field label={tipo === "PJ" ? "Razão social" : "Nome completo"}>
					<TextInput
						required
						value={companyName}
						onChange={(event) => setCompanyName(event.target.value)}
					/>
				</Field>
				<div className="grid gap-3 sm:grid-cols-2">
					<Field label={tipo === "PJ" ? "Nome fantasia" : "Apelido"}>
						<TextInput
							value={tradeName}
							onChange={(event) => setTradeName(event.target.value)}
						/>
					</Field>
					<Field label="CNAE" hint="Código da atividade principal">
						<TextInput
							inputMode="numeric"
							value={primaryCnae}
							onChange={(event) => setPrimaryCnae(event.target.value)}
							placeholder="4321500"
						/>
					</Field>
				</div>
				<Field label="Descrição do CNAE">
					<TextInput
						value={cnaeDescription}
						onChange={(event) => setCnaeDescription(event.target.value)}
						placeholder="Instalação e manutenção elétrica"
					/>
				</Field>
				<div className="grid gap-3 sm:grid-cols-3">
					<Field label="Cidade">
						<TextInput
							value={city}
							onChange={(event) => setCity(event.target.value)}
						/>
					</Field>
					<Field label="UF">
						<TextInput
							maxLength={2}
							value={state}
							onChange={(event) => setState(event.target.value.toUpperCase())}
							placeholder="MG"
						/>
					</Field>
					<Field label="CEP">
						<TextInput
							inputMode="numeric"
							value={postalCode}
							onChange={(event) => setPostalCode(event.target.value)}
							placeholder="30130-110"
						/>
					</Field>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					<Field label="Contato principal">
						<TextInput
							value={contactName}
							onChange={(event) => setContactName(event.target.value)}
							placeholder="Nome do contato decisor"
						/>
					</Field>
					<Field label="Cargo / Departamento">
						<TextInput
							value={contactRole}
							onChange={(event) => setContactRole(event.target.value)}
							placeholder="Sócio-Diretor / Gerente"
						/>
					</Field>
				</div>
				<div className="grid gap-3 sm:grid-cols-3">
					<Field label="WhatsApp / Telefone">
						<TextInput
							type="tel"
							value={contactPhone}
							onChange={(event) => setContactPhone(event.target.value)}
							placeholder="(31) 98888-7777"
						/>
					</Field>
					<Field label="E-mail do contato">
						<TextInput
							type="email"
							value={contactEmail}
							onChange={(event) => setContactEmail(event.target.value)}
							placeholder="contato@empresa.com.br"
						/>
					</Field>
					<Field label="🎂 Aniversário do decisor">
						<TextInput
							type="date"
							value={birthday}
							onChange={(event) => setBirthday(event.target.value)}
						/>
					</Field>
				</div>
				<div className="grid gap-3 sm:grid-cols-4">
					<Field label="Setor">
						<select
							value={sector}
							onChange={(event) => setSector(event.target.value)}
							className="h-11 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm outline-none focus:border-accent-500"
						>
							<option value="">Não informado</option>
							{SECTOR_OPTIONS.filter((option) => option.value !== "all").map(
								(option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								),
							)}
						</select>
					</Field>
					<Field label="Porte">
						<select
							value={companySize}
							onChange={(event) => setCompanySize(event.target.value)}
							className="h-11 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm outline-none focus:border-accent-500"
						>
							<option value="">Não informado</option>
							{COMPANY_SIZE_OPTIONS.filter(
								(option) => option.value !== "all",
							).map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</Field>
					<Field label="Temperatura">
						<select
							value={temperature}
							onChange={(event) => setTemperature(event.target.value)}
							className="h-11 w-full rounded-md border border-line-strong bg-canvas px-3 text-sm outline-none focus:border-accent-500"
						>
							<option value="">Não informada</option>
							<option value="QUENTE">Quente</option>
							<option value="MORNO">Morno</option>
							<option value="FRIO">Frio</option>
						</select>
					</Field>
					<Field label="Capital social (R$)">
						<TextInput
							type="number"
							min="0"
							step="0.01"
							value={capitalSocial}
							onChange={(event) => setCapitalSocial(event.target.value)}
						/>
					</Field>
				</div>
				<label className="flex items-center gap-2 text-xs font-semibold text-ink">
					<input
						type="checkbox"
						checked={assignToMe}
						onChange={(event) => setAssignToMe(event.target.checked)}
						className="size-4 rounded border-line-strong"
					/>
					Já incluir este lead na minha carteira
				</label>
				{formError ? (
					<p
						role="alert"
						className="rounded-md border border-brand-500/30 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-600"
					>
						{formError}
					</p>
				) : null}
				<div className="flex justify-end gap-2 border-t border-line pt-4">
					<Button variant="outline" size="sm" onClick={handleClose}>
						Cancelar
					</Button>
					<Button
						type="submit"
						variant="brand"
						size="sm"
						disabled={createLead.isPending}
						aria-busy={createLead.isPending}
						className="font-bold shadow-xs"
					>
						{createLead.isPending ? "Salvando…" : "Salvar lead"}
					</Button>
				</div>
			</form>
		</Dialog>
	);
}
