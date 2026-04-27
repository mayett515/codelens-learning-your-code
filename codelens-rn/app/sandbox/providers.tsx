import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import {
  runProviderDiscovery,
  saveDiscoveredProvider,
  getSavedProviders,
  testDiscoveredProvider,
} from '@/src/features/ai-providers';
import type { DiscoveryResult, AiProviderRow } from '@/src/features/ai-providers';
import { secureStore } from '@/src/composition';

function SandboxProvidersScreen() {
  const [providerName, setProviderName] = useState('');
  const [docsUrl, setDocsUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveryResult | null>(null);
  const [savedProviders, setSavedProviders] = useState<AiProviderRow[]>([]);

  useEffect(() => {
    loadSavedProviders();
  }, []);

  const loadSavedProviders = async () => {
    try {
      const providers = await getSavedProviders();
      setSavedProviders(providers);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDiscover = async () => {
    if (!providerName.trim()) {
      Alert.alert('Missing provider', 'Please enter the provider name to discover.');
      return;
    }

    setIsDiscovering(true);
    setDiscovered(null);

    try {
      const result = await runProviderDiscovery(providerName.trim(), docsUrl.trim() || undefined);
      setDiscovered(result);
    } catch (error) {
      Alert.alert('Discovery Failed', String(error));
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSave = async () => {
    if (!discovered) return;
    if (!apiKey.trim()) {
      Alert.alert('Missing API key', `Enter your ${discovered.providerName} API key before saving.`);
      return;
    }

    setIsSaving(true);
    try {
      await testDiscoveredProvider(discovered, apiKey);
      const secureKeyRef = `dynamic_${discovered.providerName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
      await secureStore.setApiKey(secureKeyRef, apiKey.trim());
      await saveDiscoveredProvider(discovered, secureKeyRef);
      Alert.alert('Success', `${discovered.providerName} has been saved!`);
      setDiscovered(null);
      setProviderName('');
      setDocsUrl('');
      setApiKey('');
      loadSavedProviders();
    } catch (error) {
      Alert.alert('Save Failed', String(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0f1117', padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#f2f4f8', marginBottom: 16 }}>
        Sandbox: Add AI Provider
      </Text>

      <View style={{ backgroundColor: '#1f2331', padding: 16, borderRadius: 8, marginBottom: 24 }}>
        <Text style={{ color: '#a8b0c0', marginBottom: 8 }}>Provider Name (e.g. DeepSeek)</Text>
        <TextInput
          value={providerName}
          onChangeText={setProviderName}
          style={{ backgroundColor: '#0f1117', color: '#f2f4f8', padding: 12, borderRadius: 4, marginBottom: 16 }}
          placeholderTextColor="#666"
          placeholder="Enter provider name"
        />

        <Text style={{ color: '#a8b0c0', marginBottom: 8 }}>Docs URL (optional)</Text>
        <TextInput
          value={docsUrl}
          onChangeText={setDocsUrl}
          style={{ backgroundColor: '#0f1117', color: '#f2f4f8', padding: 12, borderRadius: 4, marginBottom: 16 }}
          placeholderTextColor="#666"
          placeholder="https://provider.example/docs"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Pressable
          onPress={handleDiscover}
          disabled={isDiscovering}
          style={{
            backgroundColor: isDiscovering ? '#3a4056' : '#2563eb',
            padding: 12,
            borderRadius: 4,
            alignItems: 'center',
          }}
        >
          {isDiscovering ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '600' }}>Discover Endpoints & Models</Text>
          )}
        </Pressable>
      </View>

      {discovered && (
        <View style={{ backgroundColor: '#1f2331', padding: 16, borderRadius: 8, marginBottom: 24 }}>
          <Text style={{ fontSize: 18, color: '#f2f4f8', marginBottom: 8 }}>Discovered Configuration</Text>
          <Text style={{ color: '#a8b0c0', marginBottom: 4 }}>Name: {discovered.providerName}</Text>
          <Text style={{ color: '#a8b0c0', marginBottom: 16 }}>Base URL: {discovered.baseUrl}</Text>
          {discovered.sourceUrl ? (
            <Text style={{ color: '#a8b0c0', marginBottom: 16 }}>Source: {discovered.sourceUrl}</Text>
          ) : null}

          <Text style={{ color: '#f2f4f8', marginBottom: 8 }}>Models:</Text>
          {discovered.models.map((m) => (
            <Text key={m.id} style={{ color: '#a8b0c0', marginLeft: 8 }}>
              • {m.id} {m.isFreeTier ? '(Free)' : ''}
            </Text>
          ))}

          <Text style={{ color: '#a8b0c0', marginTop: 16, marginBottom: 8 }}>
            API Key for {discovered.providerName}
          </Text>
          <TextInput
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            style={{ backgroundColor: '#0f1117', color: '#f2f4f8', padding: 12, borderRadius: 4, marginBottom: 16 }}
            placeholderTextColor="#666"
            placeholder="provider API key"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={{
              backgroundColor: isSaving ? '#3a4056' : '#10b981',
              padding: 12,
              borderRadius: 4,
              alignItems: 'center',
              marginTop: 16,
            }}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '600' }}>Test & Save Provider</Text>
            )}
          </Pressable>
        </View>
      )}

      {savedProviders.length > 0 && (
        <View>
          <Text style={{ fontSize: 18, color: '#f2f4f8', marginBottom: 8 }}>Saved Dynamic Providers</Text>
          {savedProviders.map((p) => (
            <View key={p.id} style={{ backgroundColor: '#1f2331', padding: 12, borderRadius: 8, marginBottom: 8 }}>
              <Text style={{ color: '#f2f4f8', fontWeight: '600' }}>{p.name}</Text>
              <Text style={{ color: '#a8b0c0', fontSize: 12 }}>{p.base_url}</Text>
              {p.source_url ? (
                <Text style={{ color: '#a8b0c0', fontSize: 12 }}>{p.source_url}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export default SandboxProvidersScreen;
